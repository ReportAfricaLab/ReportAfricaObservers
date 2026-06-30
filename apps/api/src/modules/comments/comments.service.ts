import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentEntity, ReportEntity } from '../../database/entities';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepo: Repository<CommentEntity>,
    @InjectRepository(ReportEntity)
    private readonly reportRepo: Repository<ReportEntity>,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: { reportId: string; text: string; parentId?: string }) {
    const report = await this.reportRepo.findOne({ where: { id: dto.reportId } });
    if (!report) throw new NotFoundException('Report not found');

    const comment = this.commentRepo.create({
      reportId: dto.reportId,
      userId,
      text: dto.text.trim().substring(0, 1000),
      parentId: dto.parentId || null,
    });
    const saved = await this.commentRepo.save(comment);

    // Increment comment count on report
    await this.reportRepo.increment({ id: dto.reportId }, 'commentCount', 1);

    // Load user relation for real-time broadcast
    const full = await this.commentRepo.findOne({ where: { id: saved.id }, relations: ['user'] });

    // Broadcast via socket
    if (full) {
      this.realtime.emitReportUpdate(dto.reportId, {
        type: 'comment:new',
        comment: { id: full.id, text: full.text, userId: full.userId, username: full.user?.username, createdAt: full.createdAt, parentId: full.parentId },
      });
    }

    // Push notification to report author
    if (report.authorId && report.authorId !== userId) {
      this.notifications.sendToUser(report.authorId, {
        title: '💬 New comment on your report',
        body: dto.text.substring(0, 100),
        data: { type: 'comment', reportId: dto.reportId },
      }).catch(() => {});
    }

    return full || saved;
  }

  async getByReport(reportId: string, page = 1, limit = 30) {
    const [data, total] = await this.commentRepo.findAndCount({
      where: { reportId, parentId: null as any },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });

    // Load replies for each top-level comment
    const commentsWithReplies = await Promise.all(
      data.map(async (comment) => {
        const replies = await this.commentRepo.find({
          where: { parentId: comment.id },
          order: { createdAt: 'ASC' },
          take: 5,
          relations: ['user'],
        });
        return { ...comment, replies };
      }),
    );

    return { data: commentsWithReplies, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('Not your comment');

    await this.commentRepo.remove(comment);
    await this.reportRepo.decrement({ id: comment.reportId }, 'commentCount', 1);
    return { deleted: true };
  }

  async likeComment(commentId: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    await this.commentRepo.increment({ id: commentId }, 'likes', 1);
    return { likes: comment.likes + 1 };
  }
}
