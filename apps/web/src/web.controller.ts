import { Controller, Get, Query, Render } from '@nestjs/common';
import { WebService } from './web.service';

@Controller()
export class WebController {
  constructor(private readonly webService: WebService) {}

  @Get()
  @Render('index')
  getIndexPage(): Record<string, unknown> {
    return {};
  }

  @Get('chat')
  @Render('chat')
  getChatPage(
    @Query('username') username: string = 'Anonymous',
  ): Record<string, unknown> {
    return { username };
  }
}
