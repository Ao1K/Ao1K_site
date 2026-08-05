export type Lesson = {
  slug: string;
  title: string;
  category: string;
};

export const lessons: Lesson[] = [
  {
    slug: "how-to-learn",
    title: "Start Here!",
    category: "CFOP",
  },
  {
    slug: "eo",
    title: "Edge Orientation",
    category: "CFOP",
  },
  {
    slug: "keyhole",
    title: "Keyhole",
    category: "CFOP",
  }
];
