import { useEffect } from "react";
import { Router, Route, Switch, useLocation } from "wouter";
import { DefaultLayout } from "./layouts/DefaultLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomePage } from "./pages/HomePage";
import { CollectionPage } from "./pages/CollectionPage";
import { ArticlePage } from "./pages/ArticlePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { routerBase } from "./utils/base-path";

// wouter doesn't reset scroll on navigation, so without this a click deep in
// a long list opens the next page at the same scroll offset.
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

export function App() {
  return (
    <Router base={routerBase}>
      <ScrollToTop />
      <DefaultLayout>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </DefaultLayout>
    </Router>
  );
}

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/en" component={HomePage} />
      <Route path="/en/collections/:rest*" component={CollectionPage} />
      <Route path="/en/articles/:slug" component={ArticlePage} />
      <Route path="/:rest*" component={NotFoundPage} />
    </Switch>
  );
}
