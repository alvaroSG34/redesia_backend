import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ExportReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  objective!: string;
}
