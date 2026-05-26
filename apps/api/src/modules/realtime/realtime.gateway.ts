import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/realtime' })
export class RealtimeGateway {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:country')
  handleJoinCountry(@ConnectedSocket() client: Socket, @MessageBody() country: string) {
    client.join(`country:${country}`);
    this.logger.log(`${client.id} joined country:${country}`);
  }

  @SubscribeMessage('join:report')
  handleJoinReport(@ConnectedSocket() client: Socket, @MessageBody() reportId: string) {
    client.join(`report:${reportId}`);
  }

  @SubscribeMessage('comment:send')
  handleComment(@ConnectedSocket() client: Socket, @MessageBody() data: { reportId: string; text: string; username: string }) {
    this.server.to(`report:${data.reportId}`).emit('comment:new', {
      text: data.text,
      username: data.username,
      timestamp: new Date().toISOString(),
    });
  }

  // Called from services to broadcast events
  emitNewReport(country: string, report: any) {
    this.server.to(`country:${country}`).emit('report:new', report);
  }

  emitEmergencyAlert(country: string, alert: any) {
    this.server.to(`country:${country}`).emit('emergency:alert', alert);
  }

  emitReportUpdate(reportId: string, update: any) {
    this.server.to(`report:${reportId}`).emit('report:updated', update);
  }
}
