import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CourseEntity, LessonEntity, EnrollmentEntity, ModuleEntity } from '../../database/entities';

@Injectable()
export class CoursesService {
  private readonly paystackSecret: string;

  constructor(
    @InjectRepository(CourseEntity)
    private readonly courseRepo: Repository<CourseEntity>,
    @InjectRepository(LessonEntity)
    private readonly lessonRepo: Repository<LessonEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepo: Repository<EnrollmentEntity>,
    @InjectRepository(ModuleEntity)
    private readonly moduleRepo: Repository<ModuleEntity>,
    private readonly config: ConfigService,
  ) {
    this.paystackSecret = this.config.get('PAYSTACK_SECRET_KEY', '');
  }

  // === PUBLIC ===

  async getPublishedCourses() {
    return this.courseRepo.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
      relations: ['lessons'],
    });
  }

  async getCourseById(id: string) {
    const course = await this.courseRepo.findOne({ where: { id }, relations: ['lessons'] });
    if (!course) throw new NotFoundException('Course not found');
    if (course.lessons) course.lessons.sort((a, b) => a.sortOrder - b.sortOrder);
    // Fetch modules for this course
    const modules = await this.moduleRepo.find({ where: { courseId: id }, order: { sortOrder: 'ASC' }, relations: ['lessons'] });
    return { ...course, modules };
  }

  // === ADMIN ===

  async getAllCourses() {
    return this.courseRepo.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' }, relations: ['lessons'] });
  }

  async createCourse(dto: { title: string; description?: string; icon?: string; usdPrice: number; thumbnailUrl?: string; isPublished?: boolean; sortOrder?: number }) {
    const course = this.courseRepo.create(dto);
    return this.courseRepo.save(course);
  }

  async updateCourse(id: string, dto: Partial<{ title: string; description: string; icon: string; usdPrice: number; thumbnailUrl: string; isPublished: boolean; sortOrder: number }>) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    Object.assign(course, dto);
    return this.courseRepo.save(course);
  }

  async deleteCourse(id: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    await this.courseRepo.remove(course);
    return { deleted: true };
  }

  // === LESSONS ===

  async addLesson(courseId: string, dto: { title: string; videoUrl?: string; duration?: string; sortOrder?: number }) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const lesson = this.lessonRepo.create({ ...dto, courseId });
    return this.lessonRepo.save(lesson);
  }

  async updateLesson(id: string, dto: Partial<{ title: string; videoUrl: string; duration: string; sortOrder: number }>) {
    const lesson = await this.lessonRepo.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    Object.assign(lesson, dto);
    return this.lessonRepo.save(lesson);
  }

  async deleteLesson(id: string) {
    const lesson = await this.lessonRepo.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.lessonRepo.remove(lesson);
    return { deleted: true };
  }

  // === ENROLLMENTS & CERTIFICATES ===

  private generateCertId(): string {
    return 'RA-CERT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  async enroll(userId: string, courseId: string, email?: string, country?: string) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const existing = await this.enrollmentRepo.findOne({ where: { userId, courseId } });
    if (existing) return { enrolled: true, enrollment: existing };

    // Free course or price is 0
    if (!course.usdPrice || course.usdPrice <= 0) {
      const enrollment = this.enrollmentRepo.create({ userId, courseId, completedLessons: [] });
      const saved = await this.enrollmentRepo.save(enrollment);
      return { enrolled: true, enrollment: saved };
    }

    // Paid course — initiate Paystack
    if (!this.paystackSecret || !email) {
      throw new BadRequestException('Payment configuration error');
    }

    const amount = this.getLocalAmount(course.usdPrice, country || 'NG');
    const currency = this.getCurrency(country || 'NG');
    const reference = `academy_${courseId}_${userId}_${Date.now()}`;

    try {
      const res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.paystackSecret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amount: amount * 100,
          currency,
          reference,
          callback_url: `https://academy.reportafrica.africa/course/${courseId}?enrolled=true`,
          metadata: { userId, courseId, type: 'academy_enrollment' },
        }),
      });
      const data = await res.json();
      return { paymentUrl: data?.data?.authorization_url, reference };
    } catch {
      throw new BadRequestException('Payment initialization failed');
    }
  }

  async verifyEnrollmentPayment(reference: string) {
    if (!this.paystackSecret) throw new BadRequestException('Payment not configured');
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${this.paystackSecret}` },
    });
    const json = await res.json();
    if (json?.data?.status !== 'success') return { enrolled: false };

    const { userId, courseId } = json.data.metadata || {};
    if (!userId || !courseId) return { enrolled: false };

    const existing = await this.enrollmentRepo.findOne({ where: { userId, courseId } });
    if (existing) return { enrolled: true, enrollment: existing };

    const enrollment = this.enrollmentRepo.create({ userId, courseId, completedLessons: [] });
    const saved = await this.enrollmentRepo.save(enrollment);
    return { enrolled: true, enrollment: saved };
  }

  private getLocalAmount(usdPrice: number, country: string): number {
    const rates: Record<string, number> = { NG: 1500, GH: 12, KE: 150, ZA: 18, UG: 3700, EG: 48 };
    return Math.round(usdPrice * (rates[country] || 1500));
  }

  private getCurrency(country: string): string {
    const map: Record<string, string> = { NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR' };
    return map[country] || 'NGN';
  }

  async completeLesson(userId: string, courseId: string, lessonId: string) {
    let enrollment = await this.enrollmentRepo.findOne({ where: { userId, courseId } });
    if (!enrollment) {
      enrollment = this.enrollmentRepo.create({ userId, courseId, completedLessons: [] });
    }

    // Sequential unlocking: check if previous lesson is completed and quiz passed
    const course = await this.courseRepo.findOne({ where: { id: courseId }, relations: ['lessons'] });
    if (course && course.lessons.length > 0) {
      const sortedLessons = course.lessons.sort((a, b) => a.sortOrder - b.sortOrder);
      const currentIndex = sortedLessons.findIndex(l => l.id === lessonId);

      if (currentIndex > 0) {
        const prevLesson = sortedLessons[currentIndex - 1];
        // Previous lesson must be completed
        if (!enrollment.completedLessons.includes(prevLesson.id)) {
          throw new BadRequestException('Complete the previous lesson first.');
        }
        // Check if previous lesson has a quiz that must be passed
        const QuizRepo = this.enrollmentRepo.manager.getRepository('QuizEntity');
        const prevQuiz = await QuizRepo.findOne({ where: { lessonId: prevLesson.id } }) as any;
        if (prevQuiz) {
          const AttemptRepo = this.enrollmentRepo.manager.getRepository('QuizAttemptEntity');
          const passedAttempt = await AttemptRepo.findOne({ where: { userId, quizId: prevQuiz.id, passed: true } });
          if (!passedAttempt) {
            throw new BadRequestException('Pass the quiz on the previous lesson to unlock this one.');
          }
        }
      }
    }

    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons = [...enrollment.completedLessons, lessonId];
    }
    // Check if all lessons done
    if (course && course.lessons.length > 0 && enrollment.completedLessons.length >= course.lessons.length) {
      if (!enrollment.completedAt) {
        enrollment.completedAt = new Date();
        enrollment.certificateId = this.generateCertId();
        // Check master certificate
        await this.checkMasterCertificate(userId);
      }
    }
    return this.enrollmentRepo.save(enrollment);
  }

  private async checkMasterCertificate(userId: string) {
    const allCourses = await this.courseRepo.find({ where: { isPublished: true } });
    const enrollments = await this.enrollmentRepo.find({ where: { userId } });
    const completedCourseIds = enrollments.filter(e => e.completedAt && e.courseId !== 'master').map(e => e.courseId);
    if (allCourses.length > 0 && allCourses.every(c => completedCourseIds.includes(c.id))) {
      const existing = await this.enrollmentRepo.findOne({ where: { userId, courseId: 'master' } });
      if (!existing) {
        const master = this.enrollmentRepo.create({
          userId, courseId: 'master', completedLessons: [],
          completedAt: new Date(),
          certificateId: 'RA-MASTER-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        });
        await this.enrollmentRepo.save(master);
        // Set user as certified
        await this.enrollmentRepo.manager.getRepository('UserEntity').update(userId, { isCertified: true });
      }
    }
  }

  async getMyEnrollments(userId: string) {
    return this.enrollmentRepo.find({ where: { userId }, relations: ['course'], order: { createdAt: 'DESC' } });
  }

  async getCourseProgress(userId: string, courseId: string) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { userId, courseId } });
    const course = await this.courseRepo.findOne({ where: { id: courseId }, relations: ['lessons'] });
    if (!course) throw new NotFoundException('Course not found');

    const sortedLessons = (course.lessons || []).sort((a, b) => a.sortOrder - b.sortOrder);
    const completedLessons = enrollment?.completedLessons || [];

    const QuizRepo = this.enrollmentRepo.manager.getRepository('QuizEntity');
    const AttemptRepo = this.enrollmentRepo.manager.getRepository('QuizAttemptEntity');

    const lessons = await Promise.all(sortedLessons.map(async (lesson, index) => {
      const isCompleted = completedLessons.includes(lesson.id);
      let isUnlocked = index === 0; // First lesson always unlocked

      if (index > 0) {
        const prevLesson = sortedLessons[index - 1];
        const prevCompleted = completedLessons.includes(prevLesson.id);
        if (prevCompleted) {
          // Check if prev lesson quiz is passed
          const prevQuiz = await QuizRepo.findOne({ where: { lessonId: prevLesson.id } }) as any;
          if (prevQuiz) {
            const passedAttempt = await AttemptRepo.findOne({ where: { userId, quizId: prevQuiz.id, passed: true } });
            isUnlocked = !!passedAttempt;
          } else {
            isUnlocked = true;
          }
        }
      }

      // Check if this lesson has a quiz
      const quiz = await QuizRepo.findOne({ where: { lessonId: lesson.id } }) as any;
      let quizPassed = !quiz; // No quiz = auto-passed
      if (quiz) {
        const passedAttempt = await AttemptRepo.findOne({ where: { userId, quizId: quiz.id, passed: true } });
        quizPassed = !!passedAttempt;
      }

      return { id: lesson.id, title: lesson.title, type: (lesson as any).type || 'video', sortOrder: lesson.sortOrder, isCompleted, isUnlocked, hasQuiz: !!quiz, quizPassed };
    }));

    const totalLessons = sortedLessons.length;
    const completedCount = completedLessons.length;
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return { courseId, totalLessons, completedCount, progressPercent, isCompleted: !!enrollment?.completedAt, certificateId: enrollment?.certificateId, lessons };
  }

  async verifyCertificate(certificateId: string) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { certificateId }, relations: ['user', 'course'] });
    if (!enrollment) return { valid: false };
    return {
      valid: true,
      userName: enrollment.user?.displayName || enrollment.user?.username || 'Student',
      courseTitle: enrollment.courseId === 'master' ? 'Certified Citizen Journalist — Complete Program' : enrollment.course?.title,
      completedAt: enrollment.completedAt,
      certificateId: enrollment.certificateId,
    };
  }

  async getAllEnrollments() {
    return this.enrollmentRepo.find({
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  // === ANALYTICS ===

  async getAdminAnalytics() {
    const totalEnrollments = await this.enrollmentRepo.count();
    const completedEnrollments = await this.enrollmentRepo.count({ where: { completedAt: new (Function.prototype.bind.apply(Date, [null] as any))() } });
    // Use raw query for completed count since TypeORM doesn't easily filter IS NOT NULL
    const completedResult = await this.enrollmentRepo.createQueryBuilder('e').where('e.completedAt IS NOT NULL').getCount();
    const totalCourses = await this.courseRepo.count({ where: { isPublished: true } });
    const totalLessons = await this.lessonRepo.count();

    // Completion rate
    const completionRate = totalEnrollments > 0 ? Math.round((completedResult / totalEnrollments) * 100) : 0;

    // Recent enrollments (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEnrollments = await this.enrollmentRepo.createQueryBuilder('e').where('e.createdAt > :date', { date: thirtyDaysAgo }).getCount();

    // Quiz stats
    const QuizAttemptRepo = this.enrollmentRepo.manager.getRepository('QuizAttemptEntity');
    const totalAttempts = await QuizAttemptRepo.count();
    const passedAttempts = await QuizAttemptRepo.createQueryBuilder('a').where('a.passed = true').getCount();
    const quizPassRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

    return { totalEnrollments, completedEnrollments: completedResult, completionRate, totalCourses, totalLessons, recentEnrollments, quizPassRate, totalQuizAttempts: totalAttempts };
  }

  async getCourseAnalytics(courseId: string) {
    const course = await this.courseRepo.findOne({ where: { id: courseId }, relations: ['lessons'] });
    if (!course) throw new NotFoundException('Course not found');

    const enrollments = await this.enrollmentRepo.find({ where: { courseId }, relations: ['user'] });
    const totalStudents = enrollments.length;
    const completedStudents = enrollments.filter(e => e.completedAt).length;
    const completionRate = totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;

    // Drop-off analysis: which lessons have fewest completions
    const sortedLessons = (course.lessons || []).sort((a, b) => a.sortOrder - b.sortOrder);
    const lessonStats = sortedLessons.map(lesson => {
      const completedCount = enrollments.filter(e => e.completedLessons?.includes(lesson.id)).length;
      return { lessonId: lesson.id, title: lesson.title, sortOrder: lesson.sortOrder, completedBy: completedCount, completionRate: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0 };
    });

    // Students list with progress
    const students = enrollments.map(e => ({
      userId: e.userId,
      displayName: (e as any).user?.displayName || 'Unknown',
      username: (e as any).user?.username || '',
      progress: sortedLessons.length > 0 ? Math.round(((e.completedLessons?.length || 0) / sortedLessons.length) * 100) : 0,
      completed: !!e.completedAt,
      enrolledAt: e.createdAt,
    }));

    return { courseId, courseTitle: course.title, totalStudents, completedStudents, completionRate, lessonStats, students };
  }

  // === MODULES ===

  async createModule(dto: { courseId: string; title: string; description?: string; sortOrder?: number }) {
    const course = await this.courseRepo.findOne({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const module = this.moduleRepo.create(dto);
    return this.moduleRepo.save(module);
  }

  async updateModule(id: string, dto: Partial<{ title: string; description: string; sortOrder: number }>) {
    const module = await this.moduleRepo.findOne({ where: { id } });
    if (!module) throw new NotFoundException('Module not found');
    Object.assign(module, dto);
    return this.moduleRepo.save(module);
  }

  async deleteModule(id: string) {
    const module = await this.moduleRepo.findOne({ where: { id } });
    if (!module) throw new NotFoundException('Module not found');
    await this.moduleRepo.remove(module);
    return { deleted: true };
  }
}
