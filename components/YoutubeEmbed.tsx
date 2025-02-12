export default function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="aspect-w-16 aspect-h-9">
      <iframe
        className="flex w-5/6 h-5/6 align-middle justify-center"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
    </div>
  );
};
