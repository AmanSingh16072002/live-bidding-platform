import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const socket = io(API_URL);


function App() {
  const [items, setItems] = useState([]);
  const [serverOffset, setServerOffset] = useState(0);
  const [myId, setMyId] = useState(null);
  const [status, setStatus] = useState({});
  const [flash, setFlash] = useState({});

  /* Fetch Items */
  useEffect(() => {
    fetch("http://localhost:5000/items")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items);
        setServerOffset(data.serverTime - Date.now());
      });
  }, []);

  /* Socket Setup */
  useEffect(() => {
    socket.on("connect", () => {
      setMyId(socket.id);
    });

    socket.on("RESET_ITEMS", (newItems) => {
      setItems(newItems);
      setStatus({});
      setFlash({});
    });

    socket.on("UPDATE_BID", (updatedItem) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );

      const isMe = updatedItem.highestBidder === socket.id;

      setStatus((prev) => ({
        ...prev,
        [updatedItem.id]: isMe ? "winning" : "outbid",
      }));

      setFlash((prev) => ({
        ...prev,
        [updatedItem.id]: isMe ? "green" : "red",
      }));

      setTimeout(() => {
        setFlash((prev) => ({
          ...prev,
          [updatedItem.id]: null,
        }));
      }, 500);
    });

    socket.on("BID_ERROR", (msg) => {
      console.log("Error:", msg);
    });

    return () => {
      socket.off();
    };
  }, []);

  /* Timer Refresh */
  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) => [...prev]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* Send Bid */
  const placeBid = (item) => {
    socket.emit("BID_PLACED", {
      itemId: item.id,
      bidAmount: item.currentBid + 1000,
    });
  };

  /* Timer */
  const getRemaining = (endTime) => {
    const now = Date.now() + serverOffset;
    return Math.max(0, Math.floor((endTime - now) / 1000));
  };

  return (
    <div style={styles.container}>
      <h1>🔥 Live Bidding Platform</h1>

      <div style={styles.grid}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              ...styles.card,
              background:
                flash[item.id] === "green"
                  ? "#dcfce7"
                  : flash[item.id] === "red"
                  ? "#fee2e2"
                  : "#f9f9f9",
            }}
          >
            <h3>{item.title}</h3>

            <p>💰 ₹{item.currentBid}</p>

            <p>⏱ {getRemaining(item.endTime)} sec</p>

            {status[item.id] === "winning" && (
              <span style={styles.win}>🏆 Winning</span>
            )}

            {status[item.id] === "outbid" && (
              <span style={styles.outbid}>❌ Outbid</span>
            )}

            <button
              onClick={() => placeBid(item)}
              disabled={getRemaining(item.endTime)==0}
              style={{
                ...styles.btn,
                opacity: getRemaining(item.endTime)==0?0.5:1,
                cursor:
                  getRemaining(item.endTime)===0
                  ? "not-allowed"
                  : "pointer",
              }}
              
            >
              Bid +1000
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Styles */

const styles = {
  container: {
    padding: "20px",
    fontFamily: "Arial",
    textAlign: "center",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginTop: "30px",
  },

  card: {
    padding: "20px",
    borderRadius: "10px",
    background: "#f9f9f9",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    transition: "0.3s",
  },

  btn: {
    padding: "10px",
    width: "100%",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    marginTop: "10px",
  },

  win: {
    color: "green",
    fontWeight: "bold",
    display: "block",
  },

  outbid: {
    color: "red",
    fontWeight: "bold",
    display: "block",
  },
};

export default App;
