import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import MostLovedVideos from "./MostLovedVideos";

// Mock react-router-dom Link for Jest environment
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

// Mock video play method to prevent JSDOM unhandled rejection
beforeAll(() => {
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = jest.fn();
});

describe("MostLovedVideos Component", () => {
  it("renders section title, subtitle, and carousel navigation buttons", () => {
    render(<MostLovedVideos />);
    expect(screen.getByText("MOST LOVED COLLECTIONS")).toBeInTheDocument();
    expect(
      screen.getByText(/Latest & Trending Moxie Collections/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /previous collections/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next collections/i })
    ).toBeInTheDocument();
  });

  it("renders 5 video cards with badges and titles", () => {
    render(<MostLovedVideos />);
    expect(screen.getByText("NEW ARRIVAL")).toBeInTheDocument();
    expect(screen.getByText("TRENDING")).toBeInTheDocument();
    expect(screen.getByText("MOXIE PICK")).toBeInTheDocument();
    expect(screen.getByText("NEW DROP")).toBeInTheDocument();
    expect(screen.getByText("COLLECTOR PICK")).toBeInTheDocument();

    expect(screen.getByText("MOXIE WATCH COLLECTION")).toBeInTheDocument();
    expect(screen.getByText("TRENDING WATCHES")).toBeInTheDocument();
    expect(screen.getByText("PREMIUM PICKS")).toBeInTheDocument();
    expect(screen.getByText("MOXIE CAR COLLECTION")).toBeInTheDocument();
    expect(screen.getByText("DIE-CAST COLLECTION")).toBeInTheDocument();
  });

  it("renders 5 muted and looping HTML5 video elements without default controls", () => {
    const { container } = render(<MostLovedVideos />);
    const videos = container.querySelectorAll("video");
    expect(videos).toHaveLength(5);

    videos.forEach((video) => {
      expect(video).toHaveAttribute("loop");
      expect(video).toHaveAttribute("playsinline");
      expect(video).not.toHaveAttribute("controls");
    });
  });

  it("renders circular arrow buttons linking to collections", () => {
    render(<MostLovedVideos />);
    const arrowLinks = screen.getAllByRole("link", {
      name: /explore/i,
    });
    expect(arrowLinks.length).toBeGreaterThanOrEqual(5);
  });

  it("handles previous and next carousel buttons without error", () => {
    render(<MostLovedVideos />);
    const prevBtn = screen.getByRole("button", { name: /previous collections/i });
    const nextBtn = screen.getByRole("button", { name: /next collections/i });

    expect(() => {
      fireEvent.click(nextBtn);
      fireEvent.click(prevBtn);
    }).not.toThrow();
  });
});
