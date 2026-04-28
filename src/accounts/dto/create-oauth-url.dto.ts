import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateOauthUrlDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}
