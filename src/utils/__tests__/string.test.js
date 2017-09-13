import {kebabCase} from '../string';

it('should return kebab-cased string', () => {
  expect(kebabCase('AbcDef')).toBe('abc-def');
});
