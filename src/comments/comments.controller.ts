import { Controller, Get, Param } from '@nestjs/common';

import { CommentsService } from './comments.service';

@Controller('v1/posts/:postId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  getPostComments(@Param('postId') postId: string) {
    return this.commentsService.getPostComments(postId);
  }
}
