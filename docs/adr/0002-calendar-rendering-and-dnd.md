# Calendar Rendering and Drag-and-Drop

We decided to use `react-big-calendar` for the core calendar grid and `@dnd-kit/core` for drag-and-drop interactions, heavily overriding the default styles with Tailwind CSS to achieve a vibrant, custom look.

This decision was made because calculating calendar grids (overlapping events, weeks, multi-day spans) from scratch is error-prone and time-consuming. `react-big-calendar` provides a solid mathematical foundation and allows us to replace its internal components with our own customized React components. We chose `@dnd-kit/core` over other DnD libraries because of its flexibility in handling 2D spatial drops, which is essential for placing tasks onto specific time slots in the grid.
