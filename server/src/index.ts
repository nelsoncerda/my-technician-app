import 'dotenv/config';
import app from './app';

const port = process.env.PORT || 3001;

if (require.main === module) {
    app.listen(port, (error?: Error) => {
        if (error) {
            console.error(`Unable to start the API on port ${port}:`, error.message);
            process.exitCode = 1;
            return;
        }
        console.log(`Server running at http://localhost:${port}`);
    });
}

export default app;
