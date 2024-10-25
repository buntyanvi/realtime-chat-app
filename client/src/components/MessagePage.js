import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { HiDotsVertical } from "react-icons/hi";
import { FaAngleLeft } from "react-icons/fa6";
import { FaPlus } from "react-icons/fa6";
import { FaImage } from "react-icons/fa6";
import { FaVideo } from "react-icons/fa6";
import { IoMdTime } from "react-icons/io";
import { IoTrash } from "react-icons/io5";
import { IoLanguage } from "react-icons/io5";
import { IoLanguage as IoTranslate } from "react-icons/io5";
import uploadFile from "../helpers/uploadFile";
import backgroundImage from "../assets/wallapaper.jpeg";
import { IoMdSend } from "react-icons/io";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PiTranslateBold } from "react-icons/pi";

const Avatar = ({ width, height, imageUrl, name, userId }) => (
  <div
    className="rounded-full overflow-hidden bg-gradient-to-r from-blue-400 to-purple-500"
    style={{ width, height }}
  >
    {imageUrl ? (
      <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-white text-xl font-semibold">
        {name?.charAt(0)}
      </div>
    )}
  </div>
);

const MessagePage = () => {
  const params = useParams();
  const socketConnection = useSelector(
    (state) => state?.user?.socketConnection
  );
  const user = useSelector((state) => state?.user);
  const [dataUser, setDataUser] = useState({
    name: "",
    email: "",
    profile_pic: "",
    online: false,
    _id: "",
  });
  const [openImageVideoUpload, setOpenImageVideoUpload] = useState(false);
  const [message, setMessage] = useState({
    text: "",
    imageUrl: "",
    videoUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [allMessage, setAllMessage] = useState([]);
  const currentMessage = useRef(null);

  // Enhanced states
  const [showOptions, setShowOptions] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [scheduledMessage, setScheduledMessage] = useState({
    text: "",
    dateTime: "",
  });

  // Translation states
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [autoTranslate, setAutoTranslate] = useState(false);

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

  // Translation functions
  const translateText = async (text, targetLang) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Translate the following text to ${targetLang}: "${text}"`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Translation error:", error);
      return text;
    }
  };

  const handleTranslateMessage = async (messageId, text) => {
    if (!translatedMessages[messageId]) {
      setIsTranslating(true);
      const translatedText = await translateText(text, selectedLanguage);
      setTranslatedMessages((prev) => ({
        ...prev,
        [messageId]: translatedText,
      }));
      setIsTranslating(false);
    }
  };

  const toggleAutoTranslate = () => {
    setAutoTranslate(!autoTranslate);
    setShowOptions(false);
  };

  useEffect(() => {
    if (autoTranslate && allMessage.length > 0) {
      allMessage.forEach((msg) => {
        if (msg.text && !translatedMessages[msg._id]) {
          handleTranslateMessage(msg._id, msg.text);
        }
      });
    }
  }, [autoTranslate, allMessage, selectedLanguage]);

  useEffect(() => {
    if (currentMessage.current) {
      currentMessage.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [allMessage]);

  const handleOptionsClick = () => {
    setShowOptions(!showOptions);
  };

  const handleScheduleMessage = () => {
    setShowScheduleModal(true);
    setShowOptions(false);
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear this chat?")) {
      setAllMessage([]);
      setTranslatedMessages({});
      socketConnection?.emit("clear-chat", {
        sender: user?._id,
        receiver: params.userId,
      });
    }
    setShowOptions(false);
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    setTranslatedMessages({}); // Clear existing translations
    setShowOptions(false);
    if (autoTranslate) {
      // Retranslate all messages to new language
      allMessage.forEach((msg) => {
        if (msg.text) {
          handleTranslateMessage(msg._id, msg.text);
        }
      });
    }
  };

  const handleScheduleSubmit = () => {
    if (scheduledMessage.text && scheduledMessage.dateTime) {
      socketConnection?.emit("schedule-message", {
        receiverId: params.userId,
        message: scheduledMessage.text,
        scheduleTime: scheduledMessage.dateTime,
      });
      setShowScheduleModal(false);
      setScheduledMessage({ text: "", dateTime: "" });
    }
  };

  // File handling functions
  const handleUploadImageVideoOpen = () => {
    setOpenImageVideoUpload((prev) => !prev);
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    setLoading(true);
    const uploadPhoto = await uploadFile(file);
    setLoading(false);
    setOpenImageVideoUpload(false);
    setMessage((prev) => ({
      ...prev,
      imageUrl: uploadPhoto.url,
    }));
  };

  const handleClearUploadImage = () => {
    setMessage((prev) => ({
      ...prev,
      imageUrl: "",
    }));
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];
    setLoading(true);
    const uploadPhoto = await uploadFile(file);
    setLoading(false);
    setOpenImageVideoUpload(false);
    setMessage((prev) => ({
      ...prev,
      videoUrl: uploadPhoto.url,
    }));
  };

  const handleClearUploadVideo = () => {
    setMessage((prev) => ({
      ...prev,
      videoUrl: "",
    }));
  };

  useEffect(() => {
    if (socketConnection) {
      socketConnection.emit("message-page", params.userId);
      socketConnection.emit("seen", params.userId);

      socketConnection.on("message-user", (data) => {
        setDataUser(data);
      });

      socketConnection.on("message", (data) => {
        setAllMessage(data);
      });

      socketConnection.on("deleted", () => {
        setAllMessage([]);
        setTranslatedMessages({});
      });
    }
  }, [params?.userId, user]);

  const handleOnChange = (e) => {
    const { value } = e.target;
    setMessage((prev) => ({
      ...prev,
      text: value,
    }));
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.text || message.imageUrl || message.videoUrl) {
      if (socketConnection) {
        socketConnection.emit("new message", {
          sender: user?._id,
          receiver: params.userId,
          text: message.text,
          imageUrl: message.imageUrl,
          videoUrl: message.videoUrl,
          msgByUserId: user?._id,
        });
        setMessage({
          text: "",
          imageUrl: "",
          videoUrl: "",
        });
      }
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const CloseIcon = ({ size = 24 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  const OptionButton = ({ icon, children, onClick }) => (
    <button
      className="w-full px-4 py-2 text-left flex items-center gap-2 text-gray-700 hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );

  const languages = [
    "English",
    "Spanish",
    "French",
    "German",
    "Chinese",
    "Japanese",
  ];
  return (
    <div
      style={{ backgroundImage: `url(${backgroundImage})` }}
      className="bg-no-repeat bg-cover"
    >
      <header className=" top-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex justify-between items-center px-4 relative z-[9999] shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="lg:hidden hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <FaAngleLeft className="text-gray-600" size={25} />
          </Link>

          <div className="flex items-center gap-4">
            <Avatar
              width={50}
              height={50}
              imageUrl={dataUser?.profile_pic}
              name={dataUser?.name}
              userId={dataUser?._id}
            />

            <div className="flex flex-col">
              <h3 className="font-semibold text-lg text-gray-800 text-ellipsis line-clamp-1">
                {dataUser?.name}
              </h3>
              <p className="text-sm">
                {dataUser?.online ? (
                  <span className="text-green-500 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    online
                  </span>
                ) : (
                  <span className="text-gray-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    offline
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex gap-4 items-center">
          <div className="text-sm font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
            {selectedLanguage}
          </div>

          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
            onClick={() => setShowOptions(!showOptions)}
          >
            <HiDotsVertical className="text-gray-600" size={20} />
          </button>

          {showOptions && (
            <div className="absolute right-0 top-12 bg-white shadow-lg rounded-lg py-1 w-56 border border-gray-100">
              <OptionButton icon={<IoMdTime />} onClick={handleScheduleMessage}>
                Schedule a message
              </OptionButton>
              <OptionButton icon={<IoTrash />} onClick={handleClearChat}>
                Clear chat
              </OptionButton>
              <OptionButton
                icon={<IoTranslate />}
                onClick={toggleAutoTranslate}
              >
                {autoTranslate ? "Disable" : "Enable"} Auto-Translate
              </OptionButton>

              <div className="group relative">
                <OptionButton icon={<IoLanguage />}>
                  Select Language
                </OptionButton>
                <div className="absolute right-full top-0 bg-white shadow-lg rounded-lg py-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 -ml-1">
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => handleLanguageChange(lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="h-[calc(100vh-128px)] overflow-x-hidden overflow-y-scroll scrollbar relative bg-slate-200 bg-opacity-50 p-4">
        <div className="flex flex-col gap-3">
          {Array.isArray(allMessage) &&
            allMessage.map((msg, index) => (
              <div
                key={index}
                className={`group relative p-3 rounded-lg shadow-md transition duration-200 ease-in-out w-fit max-w-[280px] md:max-w-sm lg:max-w-md ${
                  user._id === msg?.msgByUserId
                    ? "ml-auto bg-teal-100"
                    : "bg-white"
                }`}
              >
                <div className="w-full">
                  {msg?.imageUrl && (
                    <img
                      src={msg?.imageUrl}
                      className="w-full h-full object-cover rounded-lg"
                      alt="message"
                    />
                  )}
                  {msg?.videoUrl && (
                    <video
                      src={msg.videoUrl}
                      className="w-full h-full object-cover rounded-lg"
                      controls
                    />
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="px-2 text-gray-700">{msg?.text}</p>
                    {translatedMessages[msg?._id] && (
                      <span className="block text-sm text-gray-600 italic">
                        {translatedMessages[msg._id]}
                      </span>
                    )}
                  </div>
                  {msg?.text &&
                    !translatedMessages[msg?._id] &&
                    !autoTranslate && (
                      <button
                        onClick={() =>
                          handleTranslateMessage(msg._id, msg.text)
                        }
                        className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:text-blue-700 transition-opacity duration-200 mt-1 whitespace-nowrap"
                      >
                        <PiTranslateBold size={20} />
                      </button>
                    )}
                </div>
                <p className="text-xs text-gray-500 text-right mt-1">
                  {msg?.createdAt ? formatTime(msg.createdAt) : ""}
                </p>
              </div>
            ))}
        </div>

        {isTranslating && (
          <div className="fixed bottom-20 right-4 bg-white p-2 rounded-lg shadow-lg">
            Translating...
          </div>
        )}

        {message?.imageUrl && (
          <div className="w-full sticky bottom-0 bg-slate-700 bg-opacity-30 flex justify-center items-center rounded-lg overflow-hidden p-3">
            <div
              className="w-fit p-2 absolute top-2 right-2 cursor-pointer hover:text-red-600"
              onClick={handleClearUploadImage}
            >
              <CloseIcon />
            </div>
            <div className="bg-white p-3 rounded-lg shadow">
              <img
                src={message.imageUrl}
                alt="uploadImage"
                className="aspect-square w-full h-full max-w-sm m-2 object-cover rounded-lg"
              />
            </div>
          </div>
        )}

        {message?.videoUrl && (
          <div className="w-full sticky bottom-0 bg-slate-700 bg-opacity-30 flex justify-center items-center rounded-lg overflow-hidden p-3">
            <div
              className="w-fit p-2 absolute top-2 right-2 cursor-pointer hover:text-red-600"
              onClick={handleClearUploadVideo}
            >
              <CloseIcon />
            </div>
            <div className="bg-white p-3 rounded-lg shadow">
              <video
                src={message.videoUrl}
                className="aspect-square w-full h-full max-w-sm m-2 object-cover rounded-lg"
                controls
                muted
                autoPlay
              />
            </div>
          </div>
        )}

        {loading && (
          <div className="w-full h-full flex sticky bottom-0 justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        )}
      </section>

      <section className="h-16 bg-white flex items-center px-4">
        <div className="relative">
          <button
            onClick={handleUploadImageVideoOpen}
            className="flex justify-center items-center w-11 h-11 rounded-full hover:bg-primary hover:text-white"
          >
            <FaPlus size={20} />
          </button>

          {openImageVideoUpload && (
            <div className="bg-white shadow rounded absolute bottom-14 w-36 p-2">
              <form>
                <label
                  htmlFor="uploadImage"
                  className="flex items-center p-2 px-3 gap-3 hover:bg-slate-200 cursor-pointer"
                >
                  <div className="text-primary">
                    <FaImage size={18} />
                  </div>
                  <p>Image</p>
                </label>
                <label
                  htmlFor="uploadVideo"
                  className="flex items-center p-2 px-3 gap-3 hover:bg-slate-200 cursor-pointer"
                >
                  <div className="text-purple-500">
                    <FaVideo size={18} />
                  </div>
                  <p>Video</p>
                </label>

                <input
                  type="file"
                  id="uploadImage"
                  onChange={handleUploadImage}
                  className="hidden"
                  accept="image/*"
                />

                <input
                  type="file"
                  id="uploadVideo"
                  onChange={handleUploadVideo}
                  className="hidden"
                  accept="video/*"
                />
              </form>
            </div>
          )}
        </div>

        <form className="h-full w-full flex gap-2" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder={`Type message in ${selectedLanguage}...`}
            className="py-1 px-4 outline-none w-full h-full"
            value={message.text}
            onChange={handleOnChange}
          />
          <button className="text-primary hover:text-secondary">
            <IoMdSend size={28} />
          </button>
        </form>
      </section>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999]">
          <div className="bg-white p-4 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Schedule Message</h3>
            <input
              type="text"
              placeholder="Message"
              className="w-full p-2 border rounded mb-2"
              value={scheduledMessage.text}
              onChange={(e) =>
                setScheduledMessage({
                  ...scheduledMessage,
                  text: e.target.value,
                })
              }
            />
            <input
              type="datetime-local"
              className="w-full p-2 border rounded mb-4"
              value={scheduledMessage.dateTime}
              onChange={(e) =>
                setScheduledMessage({
                  ...scheduledMessage,
                  dateTime: e.target.value,
                })
              }
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-primary text-white rounded"
                onClick={handleScheduleSubmit}
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagePage;
