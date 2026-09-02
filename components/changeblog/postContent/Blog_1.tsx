import LeadParagraph from "./LeadParagraph";

export default function Blog_1() {
  return (
    <>
      <div className="flex flex-row gap-2">
        <h1 className="text-3xl text-primary-300">Not another timer</h1>
        <div className="h-fit self-end pb-0.5 text-neutral-400">Aug 29th, 2026</div>
      </div>
      <div className="bg-primary-100 w-full h-1"></div>
      <div className="pt-6 gap-1 flex flex-col leading-loose">
        <LeadParagraph slug="not-another-timer" />
        <p className="pt-6">
          {`The issue is, some of the stuff you've made already exists. There's already databases of algorithms and reconstructions. There's already recon tools, alg trainers, analysis engines, and most certainly timers.`}
        </p>
        <p className="pt-6">
          <a
            href="https://cstimer.net"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-1"
          >
            cstimer.net
          </a>
          {` is a full-featured cubing timer for basically every use case. It's open source and simple to use. It runs locally in your browser, and it costs nothing. We don't need another cstimer, just shinier. Or a cstimer, just without the things that you don't personally use. And we certainly don't need to see a lesser version one that you made just for practice or for fun.`}
        </p>
        <p className="pt-6">
          {`And I get it. Your site is more than just a timer! Okay, but why the timer though? Does it link up to the rest of your website in a meaningful way? Does it have extra utility? Otherwise, what is preventing you from linking to cstimer? You want to help people learn to cube? Point them to the best tools available. Trim the fat! Kill your darlings! Delete that timer from your site.`}
        </p>
        <p className="pt-6">
          {`I will admit, some redundancy is good on the internet. It encourages competition to create the best version of the service. But everything that you add to your site is something you have to maintain. You might need to do extra bugfixing and respond to user feedback. You might need to test on multiple devices and browsers. And if you agree it's about competition, then you'll also want to improve the service. It's all time you could be spending elsewhere.`}
        </p>
        <p className="pt-6">
          {`Timers are certainly not the only example. I encourage you to talk to folks about what tools they use. Search online for a while. You'll find a lot out there already.`}
        </p>
        <p className="pt-6">
          {`So please, let me know when you have something that doesn't already exist. Make something unlike anything I've ever seen. Please, not another timer.`}
        </p>
      </div>
    </>
  );
}
