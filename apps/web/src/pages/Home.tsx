import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-4xl font-bold mb-6">Top-Down Shooter Game</h1>

      <div className="mb-8">
        <p className="text-lg mb-4 p-10">
          Welcome to the ultimate multiplayer top-down shooter experience!
          Battle against other players in fast-paced action.
        </p>
        <p className="text-lg mb-6">
          Use WASD to move, aim with your mouse, and click to shoot. Stay alive
          and rack up kills to climb the leaderboard!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-2">Features</h2>
          <ul className="text-left list-disc pl-6">
            <li>Real-time multiplayer battles</li>
            <li>Intuitive controls (WASD + mouse)</li>
            <li>Player stats tracking</li>
            <li>Global leaderboard</li>
            <li>Fast-paced action</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-2">Controls</h2>
          <ul className="text-left list-disc pl-6">
            <li>
              <strong>W, A, S, D</strong> - Move your character
            </li>
            <li>
              <strong>Mouse</strong> - Aim
            </li>
            <li>
              <strong>Left Click</strong> - Shoot
            </li>
            <li>
              <strong>Spacebar</strong> - Alternative shoot
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-center">
        {user ? (
          <button
            onClick={() => navigate("/game")}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded text-lg"
          >
            Play Now
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate("/login")}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded text-lg"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded text-lg"
            >
              Register
            </button>
          </>
        )}
        <button
          onClick={() => navigate("/leaderboard")}
          className="bg-gray-600 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded text-lg"
        >
          Leaderboard
        </button>
      </div>
    </div>
  );
};

export default Home;
