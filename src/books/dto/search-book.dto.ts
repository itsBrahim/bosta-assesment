import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum SearchByField {
  TITLE = 'title',
  AUTHOR = 'author',
  ISBN = 'isbn',
}

export class SearchBookDto {
  @ApiProperty({ example: 'gatsby', description: 'Search query string' })
  @IsString()
  @IsNotEmpty()
  q!: string;

  @ApiProperty({
    example: 'title',
    enum: SearchByField,
    description: 'Field to search by: title, author, or isbn',
  })
  @IsEnum(SearchByField)
  by!: SearchByField;
}
