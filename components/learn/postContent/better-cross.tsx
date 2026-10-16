import LessonBody from "../LessonBody";
import TitleBar from "../TitleBar";
import Story from "../LessonStory";
import LessonLink from "../LessonLink";
import LessonList from "../LessonList";
import { H1, H2 } from "../LessonHeading"

export default function BetterCross() {
  return (
    <>
      <TitleBar title="Better Cross" subtitle="" audience="all" />
      <LessonBody>
        <H1>Disclaimer</H1>
        <p>{`Cross is the first step of the CFOP method. This lesson is intended for people who already know a basic way of solving cross, but want to get better.`}</p>
        <p>{`If you don't already know cross, you have two options for how to learn it:`}</p>
        <LessonList items={[
          <span className="font-normal">
            {`Learn a `} 
            <LessonLink text="beginner's method" href="/learn/what-to-learn/#beginning" />
            , which includes cross.
          </span>, 
          "Just learn cross using those same tutorials."]} style="alpha"/>
        <p>{`You'll benefit from the lesson below once you learn and get comfortable with a basic version of cross. Until then, you can skip this lesson and come back to it. `}</p>
        <H1>Improving at cross</H1>
        <Story storyParagraphs={[""]}/>
        <p>{``}</p>
        <p>{``}</p>
        <p>{``}</p>
        <p>{``}</p>
        <p>{``}</p>
        <p>{``}</p>
        <p>{``}</p>
        <p>{``}</p>
        <p>{``}</p>
        <p>{``}</p>
        <p>{``}</p>
      </LessonBody>
    </>
  );
}
