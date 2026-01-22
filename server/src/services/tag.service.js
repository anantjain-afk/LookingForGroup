import prisma from '../db/config.js';

export const getAllTags = async () => {
  const tags = await prisma.tag.findMany({
    orderBy: {
      category: 'asc', // or name
    },
  });

  // Group by category
//   const groupedTags = tags.reduce((acc, tag) => {
//     const category = tag.category || 'Other';
//     if (!acc[category]) {
//       acc[category] = [];
//     }
//     acc[category].push(tag);
//     return acc;
//   }, {});

  return tags;
};
