from app.main import create_app

app = create_app()

print("All routes with '/tutor' in path:")
for route in app.routes:
    if hasattr(route, 'path') and '/tutor' in route.path:
        methods = route.methods if hasattr(route, 'methods') else 'N/A'
        print(f"  {route.path} - {methods}")
