export type Lesson = {
  slug: string;
  title: string;
  description: string;
  category: string;
};

export const lessons: Lesson[] = [
  {
    slug: "how-to-learn",
    title: "How to Learn",
    description: "There is much to learn, but the land is full of pitfalls. Begin your CFOP journey.",
    category: "CFOP",
  },
  {
    slug: "what-to-learn",
    title: "What to Learn",
    description: "It's an overwhelming, beautiful day. Learn all about CFOP and what's in it.",
    category: "CFOP",
  },
  {
    slug: "notation",
    title: "Notation",
    description: "There is a mysterious, powerful language. Learn 3x3 cubing notation from just a few simple rules.",
    category: "CFOP",
  },
  {
    slug: "better-cross",
    title: "Better Cross",
    description: "There is no clear path. Let's find one. Learn how to find ways to improve at cross.",
    category: "CFOP",
  },
  {
    slug: "keyhole",
    title: "Keyhole",
    description: "There is a long road. Learn how keyhole can set you down the path towards greater efficiency.",
    category: "CFOP",
  },
  {
    slug: "eo",
    title: "Edge Orientation",
    description: "There is danger. EO helps you avoid it. Learn how EO can help you decide when to rotate.",
    category: "CFOP",
  }
];
