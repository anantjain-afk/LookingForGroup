import Navbar  from "./components/Navbar.jsx";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <main className=" mx-auto px-6 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Welcome to <span className="text-green-500">LobbyLink</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Find your perfect gaming squad based on social compatibility. No
            more solo queue hell - connect with players who match your vibe!
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
