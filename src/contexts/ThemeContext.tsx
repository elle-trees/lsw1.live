import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CatppuccinFlavor = "mocha" | "frappe" | "macchiato";

interface ThemeContextType {
  flavor: CatppuccinFlavor;
  setFlavor: (flavor: CatppuccinFlavor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [flavor, setFlavorState] = useState<CatppuccinFlavor>(() => {
    // Get from localStorage or default to mocha
    const saved = localStorage.getItem("catppuccin-flavor") as CatppuccinFlavor | null;
    return saved && ["mocha", "frappe", "macchiato"].includes(saved) 
      ? saved 
      : "mocha";
  });

  const setFlavor = (newFlavor: CatppuccinFlavor) => {
    setFlavorState(newFlavor);
    localStorage.setItem("catppuccin-flavor", newFlavor);
    
    // Update the body class to switch themes
    document.body.classList.remove("mocha", "frappe", "macchiato");
    document.body.classList.add(newFlavor);
  };

  useEffect(() => {
    // Apply the theme on mount
    document.body.classList.add(flavor);
    
    return () => {
      // Cleanup on unmount
      document.body.classList.remove("mocha", "frappe", "macchiato");
    };
  }, [flavor]);

  return (
    <ThemeContext.Provider value={{ flavor, setFlavor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

