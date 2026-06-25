import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  // === USERS ===
  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('country') country?: string,
  ) {
    return this.service.getUsers(Number(page) || 1, 20, search, role, country);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: { role?: string; isVerified?: boolean; trustLevel?: string }) {
    return this.service.updateUser(id, body);
  }

  @Patch('users/:id/ban')
  banUser(@Param('id') id: string) {
    return this.service.banUser(id);
  }

  // === REPORTS ===
  @Get('reports')
  getReports(
    @Query('page') page?: string,
    @Query('country') country?: string,
    @Query('category') category?: string,
    @Query('flagged') flagged?: string,
  ) {
    return this.service.getReports(Number(page) || 1, 20, country, category, flagged === 'true');
  }

  @Delete('reports/:id')
  deleteReport(@Param('id') id: string) {
    return this.service.deleteReport(id);
  }

  @Patch('reports/:id/verify')
  verifyReport(@Param('id') id: string, @Body() body: { level: string }) {
    return this.service.updateReportVerification(id, body.level);
  }

  // === CAMPAIGNS ===
  @Get('campaigns')
  getCampaigns(@Query('page') page?: string, @Query('status') status?: string) {
    return this.service.getCampaigns(Number(page) || 1, 20, status);
  }

  @Patch('campaigns/:id/approve')
  approveCampaign(@Param('id') id: string) {
    return this.service.approveCampaign(id);
  }

  @Patch('campaigns/:id/reject')
  rejectCampaign(@Param('id') id: string) {
    return this.service.rejectCampaign(id);
  }

  // === MODERATION ===
  @Get('moderation-queue')
  getModerationQueue(@Query('page') page?: string) {
    return this.service.getModerationQueue(Number(page) || 1);
  }

  // === REVENUE ===
  @Get('revenue')
  getRevenue() {
    return this.service.getRevenue();
  }

  // === CIRCUIT BREAKER (Event Mode) ===
  @Patch('event-mode')
  toggleEventMode(@Body() body: { active: boolean }) {
    return this.service.toggleEventMode(body.active);
  }

  @Get('event-mode')
  getEventMode() {
    return this.service.getEventMode();
  }

  // === SECURITY ALERT (regional data wipe notification) ===
  @Post('security-alert')
  sendSecurityAlert(@Body() body: { country: string; message?: string }) {
    return this.service.sendSecurityAlert(body.country, body.message);
  }

  // === BUSINESSES ===
  @Get('businesses')
  getBusinesses(@Query('page') page?: string, @Query('search') search?: string) {
    return this.service.getBusinesses(Number(page) || 1, 20, search);
  }

  @Patch('businesses/:id')
  updateBusiness(@Param('id') id: string, @Body() body: any) {
    return this.service.updateBusiness(id, body);
  }

  // === CHALLENGES ===
  @Get('challenges')
  getChallenges() {
    return this.service.getChallenges();
  }

  @Patch('challenges/:id/close')
  closeChallenge(@Param('id') id: string) {
    return this.service.forceCloseChallenge(id);
  }

  // === LIVESTREAMS ===
  @Get('livestreams')
  getLivestreams() {
    return this.service.getLivestreams();
  }

  @Patch('livestreams/:id/end')
  endLivestream(@Param('id') id: string) {
    return this.service.forceEndStream(id);
  }

  // === ELECTIONS ===
  @Get('elections')
  getElections() {
    return this.service.getElections();
  }

  @Patch('elections/:id/verify-observer')
  verifyObserver(@Param('id') id: string) {
    return this.service.verifyObserver(id);
  }

  // === NOTIFICATIONS ===
  @Post('notifications/send')
  sendNotification(@Body() body: { target: string; country?: string; username?: string; title: string; body: string }) {
    return this.service.sendNotification(body);
  }

  // === TIPS ===
  @Get('tips')
  getTips() {
    return this.service.getTips();
  }

  // === TEAM MANAGEMENT ===
  @Get('team')
  getTeam() {
    return this.service.getTeam();
  }

  @Post('team/invite')
  inviteAdmin(@Request() req: any, @Body() body: { email: string; role: string }) {
    return this.service.inviteAdmin(req.adminUser, body.email, body.role);
  }

  @Patch('team/:id/role')
  changeRole(@Request() req: any, @Param('id') id: string, @Body() body: { role: string }) {
    return this.service.changeRole(req.adminUser, id, body.role);
  }

  @Delete('team/:id')
  revokeAccess(@Request() req: any, @Param('id') id: string) {
    return this.service.revokeAccess(req.adminUser, id);
  }

  @Get('me')
  getMe(@Request() req: any) {
    return { id: req.adminUser.id, email: req.adminUser.email, username: req.adminUser.username, displayName: req.adminUser.displayName, role: req.adminUser.role };
  }
}
