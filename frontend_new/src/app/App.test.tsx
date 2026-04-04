import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/app/App";

describe("App", () => {
  it("renders the shell header", () => {
    render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        initialEntries={["/settings"]}
      >
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("Money Track")).toBeInTheDocument();
  });
});
