import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "@/app/App";

describe("App", () => {
  it("renders the shell header", () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );

    expect(screen.getByText("Money Track")).toBeInTheDocument();
  });
});

