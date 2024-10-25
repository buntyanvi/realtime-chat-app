import React, { useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";
import { useSelector } from "react-redux";
import Avatar from "./Avatar";

const ScheduleMessage = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState("schedule");
  const [selectedUser, setSelectedUser] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const socketConnection = useSelector(
    (state) => state?.user?.socketConnection
  );
  const user = useSelector((state) => state?.user);

  useEffect(() => {
    if (socketConnection) {
      // Listen for scheduled messages updates
      socketConnection.on("scheduled-messages", (messages) => {
        setScheduledMessages(messages);
      });

      // Get all scheduled messages
      socketConnection.emit("get-scheduled-messages");

      // Get all users for dropdown
      socketConnection.emit("get-all-users");

      // Listen for all users response
      socketConnection.on("all-users", (users) => {
        setAllUsers(users.filter((u) => u._id !== user._id));
      });
    }

    return () => {
      if (socketConnection) {
        socketConnection.off("scheduled-messages");
        socketConnection.off("all-users");
      }
    };
  }, [socketConnection]);

  const handleScheduleMessage = () => {
    if (!selectedUser || !message || !scheduleTime) {
      alert("Please fill all fields");
      return;
    }
    console.log("###sending shedule--->", selectedUser, message, scheduleTime);
    socketConnection.emit("schedule-message", {
      receiverId: selectedUser,
      message,
      scheduleTime,
    });

    setMessage("");
    setSelectedUser("");
    setScheduleTime("");
    setActiveTab("view");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "sent":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[500px] max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Schedule Messages</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <IoClose size={24} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-4 mb-4">
            <button
              className={`px-4 py-2 rounded ${
                activeTab === "schedule"
                  ? "bg-primary text-white"
                  : "bg-gray-200"
              }`}
              onClick={() => setActiveTab("schedule")}
            >
              Schedule New
            </button>
            <button
              className={`px-4 py-2 rounded ${
                activeTab === "view" ? "bg-primary text-white" : "bg-gray-200"
              }`}
              onClick={() => setActiveTab("view")}
            >
              View Scheduled
            </button>
          </div>

          {activeTab === "schedule" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Select User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select a user</option>
                  {allUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows={4}
                  placeholder="Type your message..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Schedule Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full p-2 border rounded"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <button
                onClick={handleScheduleMessage}
                className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
              >
                Schedule Message
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {scheduledMessages.length === 0 ? (
                <p className="text-center text-gray-500">
                  No scheduled messages found
                </p>
              ) : (
                scheduledMessages.map((msg) => (
                  <div key={msg._id} className="border rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar
                        imageUrl={msg.receiver.profile_pic}
                        name={msg.receiver.name}
                        width={32}
                        height={32}
                      />
                      <div>
                        <p className="font-medium">{msg.receiver.name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(msg.scheduleTime).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`ml-auto text-sm font-medium ${getStatusColor(
                          msg.status
                        )}`}
                      >
                        {msg.status}
                      </span>
                    </div>
                    <p className="text-gray-700">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleMessage;
