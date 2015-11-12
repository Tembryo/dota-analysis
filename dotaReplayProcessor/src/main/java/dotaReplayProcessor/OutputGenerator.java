package dotaReplayProcessor;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

public class OutputGenerator {
	BufferedWriter writer;
	BufferedWriter event_writer;
	List<String> key_order;
	public OutputGenerator(String filename_out) {
		try {
		File file = new File(filename_out);
		File file_events = new File("events_"+filename_out);
		FileWriter fw;
		FileWriter fw_events;
	
		fw = new FileWriter(file);
		fw_events = new FileWriter(file_events);

		 writer = new BufferedWriter(fw);
		 event_writer = new BufferedWriter(fw_events);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public void init(Map<String, Double> data_fields) {
		key_order = new LinkedList<String>();
		
	    Iterator it = data_fields.entrySet().iterator();
		while (it.hasNext()) {
	        Map.Entry pair = (Map.Entry)it.next();
	       key_order.add((String) pair.getKey());
	    }
		Collections.sort(key_order);
        try {
			Iterator it_keys = key_order.iterator();
			while (it_keys.hasNext()) {
		        String key = (String) it_keys.next();
				writer.write(key);
				
		        if(it_keys.hasNext())
		        {
		        	writer.write(",");
		        }
		    }
			writer.write("\n");
        } catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	public void writeTick(Map<String, Double> data_fields) {
		try {
			
			Iterator it_keys = key_order.iterator();
			while (it_keys.hasNext()) {
		        String key = (String) it_keys.next();
				writer.write(""+data_fields.get(key));
				
		        if(it_keys.hasNext())
		        {
		        	writer.write(",");
		        }
		    }
			writer.write("\n");
        } catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public void writeEvent(String event)
	{
		try {
			event_writer.write(event+"\n");
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public void finish()
	{
		try {
			writer.flush();
			writer.close();
			event_writer.flush();
			event_writer.close();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

	}
}
