import {
  IsBoolean,
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  shortName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  industry!: string;

  @IsString()
  @IsOptional()
  @MaxLength(280)
  description?: string;

  @IsString()
  @IsOptional()
  status?: 'Activo' | 'Pendiente' | 'Sin cuenta';

  @IsBoolean()
  @IsOptional()
  connected?: boolean;

  @IsHexColor()
  @IsOptional()
  avatarColor?: string;
}
