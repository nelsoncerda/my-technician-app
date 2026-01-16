import { PrismaClient } from '@prisma/client';
import { ACHIEVEMENTS, LEVELS, REWARDS } from '../src/config/gamification';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Levels
  console.log('Seeding levels...');
  for (const level of LEVELS) {
    await prisma.level.upsert({
      where: { levelNumber: level.levelNumber },
      update: {
        name: level.name,
        nameEs: level.nameEs,
        minPoints: level.minPoints,
        maxPoints: level.maxPoints,
        perks: level.perks,
      },
      create: {
        levelNumber: level.levelNumber,
        name: level.name,
        nameEs: level.nameEs,
        minPoints: level.minPoints,
        maxPoints: level.maxPoints,
        perks: level.perks,
      },
    });
  }
  console.log(`Created ${LEVELS.length} levels`);

  // Seed Achievements
  console.log('Seeding achievements...');
  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {
        name: achievement.name,
        nameEs: achievement.nameEs,
        description: achievement.description,
        descriptionEs: achievement.descriptionEs,
        category: achievement.category,
        pointsReward: achievement.pointsReward,
        badgeColor: achievement.badgeColor,
        requirements: achievement.requirements,
        sortOrder: achievement.sortOrder,
        isActive: true,
      },
      create: {
        code: achievement.code,
        name: achievement.name,
        nameEs: achievement.nameEs,
        description: achievement.description,
        descriptionEs: achievement.descriptionEs,
        category: achievement.category,
        pointsReward: achievement.pointsReward,
        badgeColor: achievement.badgeColor,
        requirements: achievement.requirements,
        sortOrder: achievement.sortOrder,
        isActive: true,
      },
    });
  }
  console.log(`Created ${ACHIEVEMENTS.length} achievements`);

  // Seed Rewards
  console.log('Seeding rewards...');
  for (const reward of REWARDS) {
    await prisma.reward.upsert({
      where: { code: reward.code },
      update: {
        name: reward.name,
        nameEs: reward.nameEs,
        description: reward.description,
        descriptionEs: reward.descriptionEs,
        pointsCost: reward.pointsCost,
        category: reward.category,
        value: reward.value,
        isActive: true,
      },
      create: {
        code: reward.code,
        name: reward.name,
        nameEs: reward.nameEs,
        description: reward.description,
        descriptionEs: reward.descriptionEs,
        pointsCost: reward.pointsCost,
        category: reward.category,
        value: reward.value,
        isActive: true,
      },
    });
  }
  console.log(`Created ${REWARDS.length} rewards`);

  // Create default availability slots for existing technicians
  console.log('Creating default availability for technicians...');
  const technicians = await prisma.technician.findMany();

  for (const technician of technicians) {
    // Check if technician already has availability
    const existingSlots = await prisma.availabilitySlot.count({
      where: { technicianId: technician.id },
    });

    if (existingSlots === 0) {
      // Create default availability (Monday to Friday, 8 AM to 5 PM)
      for (let day = 1; day <= 5; day++) {
        await prisma.availabilitySlot.create({
          data: {
            technicianId: technician.id,
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '17:00',
            isRecurring: true,
            isAvailable: true,
          },
        });
      }
      console.log(`Created availability for technician: ${technician.id}`);
    }
  }

  // Initialize points for existing users
  console.log('Initializing points for existing users...');
  const users = await prisma.user.findMany();

  for (const user of users) {
    const existingPoints = await prisma.userPoints.findUnique({
      where: { userId: user.id },
    });

    if (!existingPoints) {
      await prisma.userPoints.create({
        data: {
          userId: user.id,
          totalPoints: 0,
          currentLevel: 1,
          levelProgress: 0,
          lifetimePoints: 0,
        },
      });
      console.log(`Initialized points for user: ${user.email}`);
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
