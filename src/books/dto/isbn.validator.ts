import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isISBN', async: false })
export class IsISBNConstraint implements ValidatorConstraintInterface {
  validate(isbn: string): boolean {
    if (!isbn || typeof isbn !== 'string') return false;

    // Strip hyphens and spaces
    const cleaned = isbn.replace(/[-\s]/g, '');

    if (cleaned.length === 10) {
      return this.validateISBN10(cleaned);
    } else if (cleaned.length === 13) {
      return this.validateISBN13(cleaned);
    }
    return false;
  }

  private validateISBN10(isbn: string): boolean {
    if (!/^\d{9}[\dX]$/.test(isbn)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += (10 - i) * parseInt(isbn[i]);
    }
    const checkDigit = isbn[9] === 'X' ? 10 : parseInt(isbn[9]);
    sum += checkDigit;
    return sum % 11 === 0;
  }

  private validateISBN13(isbn: string): boolean {
    if (!/^\d{13}$/.test(isbn)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(isbn[12]);
  }

  defaultMessage(): string {
    return 'isbn must be a valid ISBN-10 or ISBN-13';
  }
}

export function IsISBN(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsISBNConstraint,
    });
  };
}
