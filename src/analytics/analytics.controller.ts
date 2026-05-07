import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportReportDto } from './dto/export-report.dto';
import { AnalyticsService } from './analytics.service';

@Controller('v1/posts/:postId/comments')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('analysis')
  getPostCommentsAnalysis(@Param('postId') postId: string) {
    return this.analyticsService.getPostCommentsAnalysis(postId);
  }

  @Get('workbench-v2')
  getCommentsWorkbenchV2(@Param('postId') postId: string) {
    return this.analyticsService.getCommentsWorkbenchV2(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('analyze')
  analyzePostComments(@Param('postId') postId: string) {
    return this.analyticsService.analyzePostComments(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':commentId/reanalyze')
  reanalyzeComment(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.analyticsService.reanalyzeComment(postId, commentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('export-report')
  getCommentsExportReport(
    @Param('postId') postId: string,
    @Body() input: ExportReportDto,
  ) {
    return this.analyticsService.getCommentsExportReport(postId, input.objective);
  }
}