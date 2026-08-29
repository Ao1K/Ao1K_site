export default function Blog_1() {
  return (
    <>
      <div className="flex flex-row gap-2">
        <h1 className="text-3xl text-primary-300">Not another timer</h1>
        <div className="h-fit self-end pb-0.5 text-neutral-400">Aug 29th, 2026</div>
      </div>
      <div className="bg-primary-100 w-full h-1"></div>
      <div className="pt-6 gap-1 flex flex-col leading-loose">
        <p className="pt-6">
          {`Your idea for a website is probably very cool. I mean that earnestly. I have no reason to think otherwise. I don't know you.`}
        </p>
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
          {` is a full-featured cubing timer for basically every use case. It's open source and simple to use. It runs locally in your browser, and it costs nothing. We don't need another cstimer, just shinier. Or a cstimer, just without the things that you don't personally use. And we certainly don't need a lesser version you're still working on.`}
        </p>
        <p className="pt-6">
          {`And I get it. Your site is more than just a timer! Okay, but why the timer though? What value does the timer create? Does it link up to the rest of your website in a meaningful way? Does it have extra utility? Otherwise, what is preventing you from telling people to use cstimer? Seriously! You want to help people learn to cube? Point them to the best tools available. Trim the fat! Kill your darlings! Delete that page from your site!`}
        </p>
        <p className="pt-6">
          {`This is certainly not the only example. Talk to people. Search online. Spend some real time on it. You'll find a lot out there.`}
        </p>
        <p className="pt-6">
          {`So please, let me know when you have something that doesn't already exist. Please make something unlike anything I've ever seen. Please, not another timer.`}
        </p>
      </div>
    </>
  );
}
