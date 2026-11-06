import type { ReactNode } from "react";
import LessonBody from "../LessonBody";
import TitleBar from "../TitleBar";
import Story from "../LessonStory";
import LessonLink from "../LessonLink";
import LessonList from "../LessonList";
import CubeScene from "../CubeScene";
import AnnotatedCubeScene from "../AnnotatedCubeScene";
import CubeImage, { type CubeImageProps } from "../CubeImage";
import ExternalLink from "../../ExternalLink"
import { SCENE_PX, apply, mul, sceneGeometry } from "../../../utils/cubeSvgRender";
import { H1, H2, H3 } from "../LessonHeading";
import type { PieceName } from "../cubeProps";
import FurtherLearning, { Citation, type Source } from "../FurtherLearning";
import { crossIcon } from "../../../composables/recon/stepIconDescriptors";
import { DEFAULT_SCENE_LOOK } from "../../../utils/cubeSceneAuthoring";

export default function TwoLookOllAndPll() {
  return (
    <>
      <TitleBar title="Two Look OLL and PLL" subtitle="" audience="all" />
      <LessonBody>
        <Story storyParagraphs={[
          `Peaku sees why Prynth does not like the Council. Perhaps his father had talked to them, offered them something. Maybe they did not need convincing.`,
          `In the pause, Peaku speaks. His words echo through the hall. "I wish to save her."`,
          `"We heard. Save her from what?"`,
          `"I do not know. Something old."`,
          `The three on the Council mutter amongst themselves, tired and uninterested, then look to Peaku. "If you plan to leave, you must leave soon. We will give you three nights and three days to make your preparations. By the forth sunset, you must be gone."`,
          `Peaku knows better than to attempt to sway them. Yamison is waiting for him outside the council building.`,
          `"It is not enough time to learn much of anything," Peaku says.`,
          `Yamison limps with his cane, but his face remains placid. "No. It is not."`,
          `"How should I prepare?"`,
          `"You don't need to be here to learn. You just need to know how to learn. You will take my books."`
        ]} />
        <p>{`You can't learn everything all at once. But with the right techniques, you can make the learning go easier.`}</p>
        <p>{`Many beginners make the mistake of looking up the algorithm that they need to continue a solve. Instead, you must learn algorithms separately from solves.`}</p>
        <p>{`This lesson will discuss which algorithms you should learn to get started with CFOP, and how to most easily memorize them.`}</p>
        <H1>The first 16 algorithms</H1>
      </LessonBody>
    </>
  );
}
