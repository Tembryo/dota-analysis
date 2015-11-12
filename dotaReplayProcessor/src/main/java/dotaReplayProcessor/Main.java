package dotaReplayProcessor;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Paths;

public class Main {

	public static void main(String[] args) {
		 long tStart = System.currentTimeMillis();
		
		 System.out.println(Paths.get(".").toAbsolutePath().normalize().toString());
		 

			
		String filename_replay = "data/1864290085.dem";
		String filename_out = "replay_data.csv";
		OutputGenerator output = new OutputGenerator(filename_out);
		ReplayProcessor processor;
		try {
			processor = new ReplayProcessor(filename_replay, output);
			processor.process();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

        long tMatch = System.currentTimeMillis() - tStart;
        System.out.printf("total time taken: {}s", (tMatch) / 1000.0);
	}

}
