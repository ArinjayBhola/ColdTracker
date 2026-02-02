import { FiCheck, FiCopy } from "react-icons/fi";

export function CopyButton({
  copied,
  onClick,
  label = "Copied",
}: {
  copied: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="Copy"
      className="relative h-6 w-6"
    >
      {/* Copy icon */}
      <FiCopy
        className={`absolute inset-0 h-4 w-4 transition-all duration-300 ease-out
        ${
          copied
            ? "opacity-0 scale-75 rotate-12"
            : "opacity-100 scale-100 rotate-0 text-muted-foreground hover:text-primary"
        }`}
      />

      {/* Check icon */}
      <FiCheck
        className={`absolute inset-0 h-4 w-4 transition-all duration-300 ease-out
        ${
          copied
            ? "opacity-100 scale-110 rotate-0 text-green-600"
            : "opacity-0 scale-75 -rotate-12"
        }`}
      />

      {/* Tooltip */}
      <span
        className={`absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-black px-2 py-0.5 text-[10px] text-white
        transition-all duration-300
        ${
          copied
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1 pointer-events-none"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
