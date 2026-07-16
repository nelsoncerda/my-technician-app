const test = require('node:test');
const assert = require('node:assert/strict');

const prismaPath = require.resolve('../dist/prisma');
const controllerPath = require.resolve('../dist/controllers/technicianController');

test('ratings view returns aggregates without loading written reviews', async () => {
  let findManyOptions;
  const findMany = async (options) => {
    findManyOptions = options;
    return [
      {
        id: 'tech-1',
        user: { name: 'María Técnica', photoUrl: null },
        specializations: ['Electricidad'],
        location: 'Santiago',
        companyName: null,
        rating: 4.8,
        verified: true,
        _count: { reviews: 12 },
      },
    ];
  };

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: { __esModule: true, default: { technician: { findMany } } },
  };
  delete require.cache[controllerPath];

  const { getTechnicians } = require(controllerPath);
  let body;
  const response = {
    json(value) {
      body = value;
      return this;
    },
    status() {
      assert.fail('The ratings view should not return an error status');
    },
  };

  await getTechnicians({ query: { view: 'ratings' } }, response);

  assert.deepEqual(findManyOptions.include._count, { select: { reviews: true } });
  assert.equal('reviews' in findManyOptions.include, false);
  assert.deepEqual(body, [
    {
      id: 'tech-1',
      name: 'María Técnica',
      photoUrl: null,
      specialization: 'Electricidad',
      specializations: ['Electricidad'],
      location: 'Santiago',
      companyName: null,
      rating: 4.8,
      ratingCount: 12,
      verified: true,
    },
  ]);
  assert.equal(JSON.stringify(body).includes('comment'), false);
  assert.equal(JSON.stringify(body).includes('author'), false);
});
