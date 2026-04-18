/**
 * IELTS domain layer barrel export.
 *
 * All IELTS rules live in this directory. Feature code should import from
 * here rather than reaching into individual files.
 *
 * @module domain/ielts
 */

module.exports = {
  ...require('./format'),
  ...require('./scoring'),
  ...require('./exam-ux'),
  ...require('./rubrics'),
  ...require('./postProcessor'),
  ...require('./examinerPersona'),
};
