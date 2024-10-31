import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WsDto {
  @IsNotEmpty()
  @IsOptional()
  room: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsOptional()
  message: string;

  @IsString()
  @IsOptional()
  replyTo?: string;
}
