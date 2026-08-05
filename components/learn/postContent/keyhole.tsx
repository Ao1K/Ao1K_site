import LessonList from "../LessonList";
import LessonBody from "../LessonBody";
import S from "../LessonSpan";
import Story from "../LessonStory";
import LessonLink from "../LessonLink";
import TitleBar from "../TitleBar";


export default function Keyhole() {
  return (
    <>
    <TitleBar title="Keyhole" subtitle="Five percent of F2L?"></TitleBar>
    <LessonBody>
      <p>Keyhole is a technique. It lets you solve certain F2L cases quickly and without much risk.</p>
      <p>It can be hard to know when you're solving a pair perfectly. When you get to use keyhole, you'll pretty much know. Any alternative solution, one that doesn't utilize the keyhole technique, will almost always be slower.</p>
      <p>Does keyhole actually apply to 5% of all cases? Probably not. But it is one of your first chunk of cases that you get to solve perfectly well. A dubious five percent of the time, anyway.</p>
    </LessonBody>
    </>
  )
}