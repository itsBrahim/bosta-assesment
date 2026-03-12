import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';
import { IsISBN } from './isbn.validator';

export class CreateBookDto {
  @ApiProperty({ example: 'The Great Gatsby', description: 'Title of the book' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'F. Scott Fitzgerald', description: 'Author of the book' })
  @IsString()
  @IsNotEmpty()
  author!: string;

  @ApiProperty({ example: '978-0-7432-7356-5', description: 'ISBN-10 or ISBN-13' })
  @IsString()
  @IsISBN()
  isbn!: string;

  @ApiProperty({ example: 5, description: 'Number of available copies', minimum: 0 })
  @IsInt()
  @Min(0)
  availableQuantity!: number;

  @ApiProperty({ example: 'A-12', description: 'Shelf location in the library' })
  @IsString()
  @IsNotEmpty()
  shelfLocation!: string;
}
