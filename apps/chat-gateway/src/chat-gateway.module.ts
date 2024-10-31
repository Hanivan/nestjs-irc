import { Module } from '@nestjs/common';
import { ChatGatewayWSController } from './chat-gateway.ws.controller';

@Module({
  imports: [],
  providers: [ChatGatewayWSController],
})
export class ChatGatewayModule {}
