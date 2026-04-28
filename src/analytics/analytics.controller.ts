import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
}

