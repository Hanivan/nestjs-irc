import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { arrayNotEmpty, validate } from 'class-validator';
import { filter, from, tap } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { WsDto } from './dtos/create-message.dto';

@WebSocketGateway(3001, { cors: { origin: '*' }, namespace: 'chat-gateway' })
export class ChatGatewayWSController {
  @WebSocketServer() private readonly server: Server;
  private users: Set<string> = new Set(); // To track connected users
  private readonly logger = new Logger(ChatGatewayWSController.name);

  /**
   * This is a WebSocket handler function in a NestJS application.
   * It handles the 'joinRoom' message from a client.
   *
   * Here's what it does:
   * 1. Validates the incoming payload.
   * 2. Adds the user to a set of connected users and joins them to a specific room.
   * 3. Broadcasts a message to all clients in the same room, announcing the user's arrival.
   * 4. Logs the message at a verbose level.
   *
   * @param client - The client that sent the 'joinRoom' message
   * @param payload - The payload sent by the client. See the WsDto class for more information
   */
  @SubscribeMessage('joinRoom')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    const wsData = await this.validatePayload(payload);
    this.users.add(wsData.username);
    client.join(wsData.room);
    this.logger.log(`Current connected users: ${this.users?.size}`);
    this.broadcastMessage(
      wsData.room,
      'System',
      `"${wsData.username}" has joined the chat.`,
    );
  }

  /**
   * This is a WebSocket handler function in a NestJS application
   * that handles the 'leaveRoom' message from a client.
   *
   * Here's what it does:
   * 1. Validates the incoming payload.
   * 2. Finds the user leaving the chat by filtering through the set of connected users based on the client's socket ID.
   * 3. Removes the user from the set of connected users.
   * 4. Makes the client leave the room.
   * 5. Broadcasts a message to all clients in the same room, announcing the user's departure.
   * 6. Logs the message at a verbose level.
   *
   * @param client - The client that sent the 'leaveRoom' message
   * @param payload - The payload sent by the client. See the WsDto class for more information
   */
  @SubscribeMessage('leaveRoom')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    const wsData = await this.validatePayload(payload);

    from(this.users)
      .pipe(
        filter((username) => username === wsData?.username),
        tap((username) => {
          this.users.delete(username);
          client.leave(wsData?.room);
          this.broadcastMessage(
            wsData?.room,
            'System',
            `"${username}" has left the chat.`,
          );
        }),
      )
      .subscribe();
  }

  /**
   * This is a WebSocket message handler in a NestJS application.
   * When a client sends a 'message' to the server, this function is triggered.
   *
   * Here's what it does:
   * 1. Validates the incoming message payload.
   * 2. Logs a debug message with the client's ID, room, and payload.
   * 3. Broadcasts the original message to all clients in the same room.
   *
   * @param client - The client that sent the 'message'
   * @param payload - The payload sent by the client. See the WsDto class for more information
   */
  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    const wsData = await this.validatePayload(payload);
    this.logger.debug(
      `Received message from ${client?.id} in room ${wsData?.room}: ${JSON.stringify(wsData)}`,
    );
    this.broadcastMessage(
      wsData?.room,
      wsData?.username,
      wsData?.message,
      wsData?.replyTo,
    );
  }

  private async validatePayload(payload: unknown) {
    if (typeof payload !== 'object') {
      return;
    }

    const wsData = plainToInstance(WsDto, payload);
    const err = await validate(wsData);
    if (arrayNotEmpty(err)) {
      throw new WsException(err);
    }

    return wsData;
  }

  private broadcastMessage(
    room: string,
    username: string,
    message: string,
    replyTo?: string,
  ) {
    this.server.to(room).emit('message', { username, message, replyTo });
  }
}
