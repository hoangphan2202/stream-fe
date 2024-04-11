import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [devices, setDevices] = useState([]);
  const audioRef = React.createRef(null);
  const fileRef = React.createRef(null);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  useEffect(() => {
    const getStream = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
        setMyStream(stream);
    }
    getStream()
  }, []);

  const handleCallUser = useCallback(async () => {
    // const stream = await navigator.mediaDevices.getUserMedia({
    //   audio: true,
    //   video: true,
    // });

    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    // setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);



      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      // navigator.mediaDevices
      //     .selectAudioOutput()
      //     .then((device) => {
      //       console.log(`${device.kind}: ${device.label} id = ${device.deviceId}`);
      //     })
      //     .catch((err) => {
      //       console.error(`${err.name}: ${err.message}`);
      //     });

      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  const applyShareAudio = async (stream) => {

  }

  // useEffect(() => {
  //   navigator.mediaDevices.enumerateDevices().then((devices) => {
  //     setDevices(devices);
  //   });
  // }, []);

  const playAudio = (e) => {
    if (e.target.files.length) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      audioRef.current.src = url;
      audioRef.current.play();

      const audio = audioRef.current

      audio.onplay = (e) => {
        // When seek to begin of audio
        if ( e.target.currentTime === 0 ) {
          console.log('When seek to begin of audio');
          return;
        }
        // When seek any where
        if ( e.target.currentTime !== 0 ) {
          console.log('When seek any where');
          return;
        }
        console.log('Audio play first time from 0');
        const audioMediaSource = audioRef.captureStream();

        audioMediaSource.then((backgroundAudioStream) => {
          const videoTracks = backgroundAudioStream.getVideoTracks();
          if ( videoTracks.length > 0 ) {
            videoTracks.map( videoTrack => {
              backgroundAudioStream.removeTrack(videoTrack);
              // Let it go
              videoTrack.stop();
            });
          }
        })
        // const audioTrack = backgroundAudioStream.getAudioTracks()[0];
        // if ( audioTrack ) {
        //   this.localBackgroundAudioTrack = audioTrack;
        //
        //   // Handle for Presenter: add to Presenter media stream via audioMerger
        //   const audioMerger = this.audioMerger;
        //   if ( audioMerger && audioMerger.started && backgroundAudioStream ) {
        //     audioMerger.addStream( backgroundAudioStream );
        //   }
        //
        //   // Handle for Viewer peer connections
        //   // Use to push to viewer peerConnection when make invite connection or replace if the viewer peerConnection already existed
        //   // Cannot use current audioMerger result because it contain viewer audio
        //   // Create new audio merger for connection to viewer
        //   // Just merge audio
        //   // Create new audio merger for localAudio and background audio
        //   const inviteAudioMerger = this.inviteAudioMerger = new VideoStreamMerger();
        //   inviteAudioMerger.addStream(backgroundAudioStream);
        //   inviteAudioMerger.addStream(this.localAudioStream);
        //   // Start the merging. Calling this makes the result available to us
        //   inviteAudioMerger.start();
        //   // Note: when presenter share audio and connect to viewer after that, let get audio from
        //   // inviteAudioMerger to use in antWebRTCMediaStream
        //
        //   const newAudioTrack = inviteAudioMerger.result.getAudioTracks()[0];
        //   Object.values(this.peerConnections).map( async peerConnection => {
        //     const presenterMediaStream = peerConnection.getLocalPresenterStream();
        //     if ( presenterMediaStream ) {
        //       const currentPresenterAudioTrack = presenterMediaStream.getAudioTracks()[0];
        //       await peerConnection.replaceTrack(currentPresenterAudioTrack, newAudioTrack);
        //     }
        //   });
        //
        //   // Change the audio share state when all things done
        //   setTimeout(() => {
        //     // Cause by if the user seek right after the audio input appear
        //     // Sometime we got quiet sound, so just display the audio input after 1s to prevent it
        //     console.log('setIsAudioShared:', shareAudio);
        //     this.props.setIsAudioShared(shareAudio);
        //   }, 500);
        //
        //   // When user click stop share source on chrome sharing bar
        //   backgroundAudioStream.addEventListener('inactive', this.handleBackgroundAudioStreamInactive);
        // } else {
        //   console.log('Cannot get background audio sound, please try again or contact to supporter!');
        // }
      };
    }
  }

    const changeSound = (deviceId) => {
    remoteStream.getAudioTracks().forEach((track) => {
        track.applyConstraints({
            deviceId: deviceId
        })
    })
    }

  let audioInputDevices = devices.filter(device => device.kind === 'audioinput');
  let audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
  let videoInputDevices = devices.filter(device => device.kind === 'videoinput');

  return (
      <div>
        <h1>Room Page</h1>
        {
          audioInputDevices.map((device) => (
              <div>
                <p>{device.label}</p>
                <p>{device.deviceId}</p>
                <p>{device.kind}</p>
                {/*<button onClick={() => changeSound(device.deviceId)}>change</button>*/}
              </div>
          ))
        }
        {
          audioOutputDevices.map((device) => (
              <div>
                <p>{device.label}</p>
                <p>{device.deviceId}</p>
                <p>{device.kind}</p>

                {/*<button onClick={() => changeSound(device.deviceId)}>change</button>*/}
              </div>
          ))
        }
        {
          videoInputDevices.map((device) => (
              <div>
                <p>{device.label}</p>
                <p>{device.deviceId}</p>
                <p>{device.kind}</p>

                {/*<button onClick={() => changeSound(device.deviceId)}>change</button>*/}
              </div>
          ))
        }
        <input
        ref={fileRef}
        type="file"
          onChange={playAudio}
        />
        <audio
            ref={audioRef}
               autoPlay={true}
               controls={true}
            controlsList="nodownload"
        />
        <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>
        {myStream && <button onClick={sendStreams}>Send Stream</button>}
        {remoteSocketId && <button onClick={handleCallUser}>CALL</button>}
        {myStream && (
            <>
              <h1>My Stream</h1>
              <ReactPlayer
                  playing
                  muted
                  height="100px"
                  width="200px"
                  url={myStream}
              />
            </>
        )}
        {remoteStream && (
            <>
              <h1>Remote Stream</h1>
              <ReactPlayer
                  playing
                  // muted
                  height="100px"
                  width="200px"
                  url={remoteStream}
              />
            </>
        )}
      </div>
  );
};

export default RoomPage;
