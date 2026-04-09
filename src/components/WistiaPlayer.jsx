import React from 'react';

const WistiaPlayer = ({ mediaId }) => {
  return (
    <div className="mt-8 z-10 w-full max-w-[800px]">
      <style>
        {`
          wistia-player[media-id='${mediaId}']:not(:defined) {
            background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/${mediaId}/swatch');
            display: block;
            filter: blur(5px);
            padding-top: 56.25%;
          }
        `}
      </style>
      <wistia-player media-id={mediaId} aspect="1.7777777777777777" style={{ width: "100%" }} />
    </div>
  );
};

export default WistiaPlayer;