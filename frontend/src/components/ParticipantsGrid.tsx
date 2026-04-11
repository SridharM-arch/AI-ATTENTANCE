import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import Peer from 'simple-peer';

interface Participant {
  id: string;
  name: string;
  isHost?: boolean;
  isSpeaking?: boolean;
  micOn?: boolean;
  videoOn?: boolean;
}

interface ParticipantsGridProps {
  myVideo: React.RefObject<HTMLVideoElement>;
  myName: string;
  isHost: boolean;
  peers: { [id: string]: Peer.Instance };
  peerMetadata: { [id: string]: Participant };
  micOn: boolean;
  videoOn: boolean;
}

export const ParticipantsGrid: React.FC<ParticipantsGridProps> = ({
  myVideo,
  myName,
  isHost,
  peers,
  peerMetadata,
  micOn,
  videoOn
}) => {
  const videoRefs = useRef<{ [id: string]: HTMLVideoElement }>({});

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Grid Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="grid gap-4 w-full h-full p-4 auto-rows-max"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gridAutoRows: 'minmax(240px, 1fr)',
          gridAutoFlow: 'dense'
        }}
      >
        {/* My Video */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative backdrop-blur-xl bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-purple-500/50 rounded-2xl overflow-hidden shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 group"
        >
          {/* Video Stream */}
          <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <video
              ref={myVideo}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Fallback text when no video */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
              <span className="text-white text-sm">📹 Camera loading...</span>
            </div>
          </div>

          {/* Status Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Name Plate */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="backdrop-blur-md bg-black/50 rounded-lg px-3 py-2 border border-white/20">
              <p className="text-white font-semibold text-sm">{myName}</p>
              <p className="text-gray-300 text-xs">(You)</p>
            </div>
            {isHost && (
              <div className="backdrop-blur-md bg-gradient-to-r from-yellow-500/40 to-amber-500/40 rounded-lg px-3 py-2 border border-yellow-300/50">
                <p className="text-yellow-200 font-semibold text-sm">👑 Host</p>
              </div>
            )}
          </div>

          {/* Audio/Video Status */}
          <div className="absolute top-4 right-4 flex gap-2">
            <motion.div
              animate={{ scale: micOn ? 1 : [1, 1.1, 1] }}
              className={`p-2 rounded-full backdrop-blur-md ${
                micOn
                  ? 'bg-green-500/40 border border-green-400/50'
                  : 'bg-red-500/40 border border-red-400/50'
              }`}
            >
              {micOn ? (
                <Mic className="w-5 h-5 text-green-300" />
              ) : (
                <MicOff className="w-5 h-5 text-red-300" />
              )}
            </motion.div>
            <motion.div
              animate={{ scale: videoOn ? 1 : [1, 1.1, 1] }}
              className={`p-2 rounded-full backdrop-blur-md ${
                videoOn
                  ? 'bg-blue-500/40 border border-blue-400/50'
                  : 'bg-red-500/40 border border-red-400/50'
              }`}
            >
              {videoOn ? (
                <Video className="w-5 h-5 text-blue-300" />
              ) : (
                <VideoOff className="w-5 h-5 text-red-300" />
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Peer Videos */}
        {Object.entries(peers).map(([peerId, peer], index) => (
          <motion.div
            key={peerId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * (index + 1) }}
            className={`relative backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
              peerMetadata[peerId]?.isSpeaking
                ? 'border-4 border-green-400 shadow-green-500/50'
                : 'border-2 border-white/20 hover:border-purple-500/50'
            }`}
          >
            <PeerVideo
              peer={peer}
              peerId={peerId}
              metadata={peerMetadata[peerId]}
              videoRef={(ref) => {
                if (ref) videoRefs.current[peerId] = ref;
              }}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

interface PeerVideoProps {
  peer: Peer.Instance;
  peerId: string;
  metadata?: Participant;
  videoRef: (ref: HTMLVideoElement) => void;
}

const PeerVideo: React.FC<PeerVideoProps> = ({ peer, peerId, metadata, videoRef }) => {
  const videoEl = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    peer.on('stream', (stream: MediaStream) => {
      if (videoEl.current) {
        videoEl.current.srcObject = stream;
        videoRef(videoEl.current);
      }
    });

    return () => {
      peer.removeAllListeners('stream');
    };
  }, [peer, videoRef]);

  return (
    <div className="w-full h-full relative group bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
      <video
        ref={videoEl}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      {/* Fallback when no stream */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none bg-gradient-to-br from-gray-800 to-gray-900">
        <span className="text-white text-sm">📹 Loading...</span>
      </div>

      {/* Status Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Name Plate */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="backdrop-blur-md bg-black/50 rounded-lg px-3 py-2 border border-white/20">
          <p className="text-white font-semibold text-sm">{metadata?.name || 'Unknown'}</p>
          {metadata?.isSpeaking && (
            <p className="text-green-300 text-xs animate-pulse">🔊 Speaking</p>
          )}
        </div>
        {metadata?.isHost && (
          <div className="backdrop-blur-md bg-gradient-to-r from-yellow-500/40 to-amber-500/40 rounded-lg px-3 py-2 border border-yellow-300/50">
            <p className="text-yellow-200 font-semibold text-sm">👑</p>
          </div>
        )}
      </div>

      {/* Audio/Video Status */}
      <div className="absolute top-4 right-4 flex gap-2">
        <motion.div
          animate={{ scale: metadata?.micOn ? 1 : [1, 1.1, 1] }}
          className={`p-2 rounded-full backdrop-blur-md ${
            metadata?.micOn
              ? 'bg-green-500/40 border border-green-400/50'
              : 'bg-red-500/40 border border-red-400/50'
          }`}
        >
          {metadata?.micOn ? (
            <Mic className="w-5 h-5 text-green-300" />
          ) : (
            <MicOff className="w-5 h-5 text-red-300" />
          )}
        </motion.div>
        <motion.div
          animate={{ scale: metadata?.videoOn ? 1 : [1, 1.1, 1] }}
          className={`p-2 rounded-full backdrop-blur-md ${
            metadata?.videoOn
              ? 'bg-blue-500/40 border border-blue-400/50'
              : 'bg-red-500/40 border border-red-400/50'
          }`}
        >
          {metadata?.videoOn ? (
            <Video className="w-5 h-5 text-blue-300" />
          ) : (
            <VideoOff className="w-5 h-5 text-red-300" />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ParticipantsGrid;
