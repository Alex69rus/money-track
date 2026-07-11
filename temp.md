Let's proceed with our FE redesign.
Read [README.md](frontend_new/README.md) and all linked there documents. 
Let's do Phase 5 from [implementation-roadmap.md](frontend_new/docs/implementation-roadmap.md) 


Issues after implementation TWA-1:
1. We need to add a save space at the top of all our scrrens so in never be overlapped with service buttons (back buttom, hide, etc.) Currently our screens starts at the very top of the view and are overlapped with service buttons

UI/UX issues:
1. Categories without childs shouldn't have a ">" icon, as it is misleading. It should be removed for categories without childs.
2. Remove the edit button from each transaction card at the transactions list and replace it with simple click on the transaction card, so clicking on the transaction card will open the edit transaction screen. But still we should have ability to click on the category for quick category selection and click at the tags + sign to edit tags for the transaction.
3. If the category is not selected - the category icon should not _, but ? or somthing else telling that category is not selected and welcomming user to select category
4. The Analytics screen widget with split by tags should also support drilldown
5. The Analytics screen drilldown to category split view should have category sign for each transaction like we have in the transactions view. Maybe we can reuse the same component so they be consistend and have the same functionality
6. The Analytics screen widgets: split by category and split by tags should present top 5 items (and has that high of these 5 items, no scrolls inside of this widget) and the View all button should be available and present the full list of the items.
7. The Monthly trends widget at the Analytics screen should have ability to click at the month and as a hint show the values of incode and expense, so user can understand the values of these bars, not only see them visually


Let's consider these bugs and adjust our documentation having requirements. And maybe we need to introduce some another type of documentation so we can describe some things separately. Let's thing about way of having such documentation.
