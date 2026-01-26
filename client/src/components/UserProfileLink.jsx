import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

export default function UserProfileLink({ username, className }) {
    if (!username) return <span className="text-gray-500">Unknown</span>;

    return (
        <Link 
            to={`/profile/${username}`}
            className={cn(
                "hover:text-[#5865F2] hover:underline transition-colors font-medium cursor-pointer", 
                className
            )}
            onClick={(e) => e.stopPropagation()} // Prevent triggering parent click events (like lobby card nav)
        >
            {username}
        </Link>
    );
}
