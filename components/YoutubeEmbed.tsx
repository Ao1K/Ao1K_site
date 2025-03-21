export default function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="aspect-video">
      <iframe
        className="flex w-full h-full align-middle justify-center"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
    </div>
  );
};
