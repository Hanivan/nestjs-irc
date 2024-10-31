import { Test, TestingModule } from '@nestjs/testing';
import { ChatGatewayWSController } from './chat-gateway.ws.controller';
import { ChatGatewayWSService } from './chat-gateway.ws.service';

describe('ChatGatewayWSController', () => {
  let chatGatewayWsController: ChatGatewayWSController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ChatGatewayWSController],
      providers: [ChatGatewayWSService],
    }).compile();

    chatGatewayWsController = app.get<ChatGatewayWSController>(
      ChatGatewayWSController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(chatGatewayWsController.handleMessage()).toBe('Hello World!');
    });
  });
});
