import { Controller, Get, Param } from '@nestjs/common';

import { PostsService } from './posts.service';

@Controller('v1/clients/:clientId/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  getPosts(@Param('clientId') clientId: string) {
    return this.postsService.getPosts(clientId);
  }

  @Get(':postId/detail-v2')
  getPostDetailV2(
    @Param('clientId') clientId: string,
    @Param('postId') postId: string,
  ) {
    return this.postsService.getPostDetailV2(clientId, postId);
  }

  @Get(':postId')
  getPost(
    @Param('clientId') clientId: string,
    @Param('postId') postId: string,
  ) {
    return this.postsService.getPost(clientId, postId);
  }
}
