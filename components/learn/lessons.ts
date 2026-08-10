export type Lesson = {
  slug: string;
  title: string;
  description: string;
  category: string;
};

export const lessons: Lesson[] = [
  // {
  //   slug: "how-to-learn",
  //   title: "Start Here!",
  //   category: "CFOP",
  // },
  {
    slug: "eo",
    title: "Edge Orientation",
    description: "There is danger. EO helps you avoid it. Learn how EO can help you decide when to rotate.",
    category: "CFOP",
  },
  {
    slug: "keyhole",
    title: "Keyhole",
    description: "There is a long road. Learn how keyhole can set you down the path towards greater efficiency.",
    category: "CFOP",
  }
];
